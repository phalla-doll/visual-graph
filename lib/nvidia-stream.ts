const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = "openai/gpt-oss-120b"

export interface StreamOptions {
    prompt: string
    apiKey: string
    maxTokens?: number
    temperature?: number
    topP?: number
    signal?: AbortSignal
}

export type StreamResult =
    | {
          ok: true
          content: string
          reasoning: string
          finishReason: string | undefined
      }
    | { ok: false; status: number; error: string }

export async function streamNvidiaCompletion(
    options: StreamOptions
): Promise<StreamResult> {
    const {
        prompt,
        apiKey,
        maxTokens = 8192,
        temperature = 0.6,
        topP = 0.95,
        signal,
    } = options

    let upstream: Response
    try {
        upstream = await fetch(NVIDIA_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: "user", content: prompt }],
                // gpt-oss-120b is a reasoning model — it spends tokens on
                // chain-of-thought before producing `content`. Need headroom
                // or it hits `finish_reason: "length"` with `content: null`.
                max_tokens: maxTokens,
                temperature,
                top_p: topP,
                // Stream so response headers arrive immediately. Non-streaming
                // requests can exceed undici's 300s headersTimeout while the
                // model is still reasoning, surfacing as a 5-minute hang → 502.
                stream: true,
            }),
            signal,
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : "Network error"
        return {
            ok: false,
            status: 502,
            error: `Upstream request failed: ${message}`,
        }
    }

    if (!upstream.ok) {
        const text = await upstream.text().catch(() => "")
        return {
            ok: false,
            status: 502,
            error: `Upstream returned HTTP ${upstream.status}: ${text.slice(0, 400)}`,
        }
    }

    if (!upstream.body) {
        return {
            ok: false,
            status: 502,
            error: "Upstream returned an empty stream.",
        }
    }

    let content = ""
    let reasoning = ""
    let finishReason: string | undefined
    try {
        const reader = upstream.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let nl: number
            while ((nl = buffer.indexOf("\n")) !== -1) {
                const rawLine = buffer.slice(0, nl)
                buffer = buffer.slice(nl + 1)
                const line = rawLine.trim()
                if (!line.startsWith("data:")) continue
                const payload = line.slice(5).trim()
                if (!payload || payload === "[DONE]") continue
                try {
                    const parsed = JSON.parse(payload) as {
                        choices?: {
                            finish_reason?: string | null
                            delta?: {
                                content?: string | null
                                reasoning_content?: string | null
                            }
                        }[]
                    }
                    const choice = parsed.choices?.[0]
                    if (choice?.delta?.content) content += choice.delta.content
                    if (choice?.delta?.reasoning_content)
                        reasoning += choice.delta.reasoning_content
                    if (choice?.finish_reason)
                        finishReason = choice.finish_reason
                } catch {
                    // Skip malformed SSE frames — keep reading the rest.
                }
            }
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "Stream error"
        return {
            ok: false,
            status: 502,
            error: `Upstream stream failed: ${message}`,
        }
    }

    return { ok: true, content, reasoning, finishReason }
}
