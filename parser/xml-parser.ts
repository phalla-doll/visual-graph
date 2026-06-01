import { XMLParser } from "fast-xml-parser"

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    allowBooleanAttributes: true,
    parseAttributeValue: false,
    trimValues: true,
})

export class XmlParseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "XmlParseError"
    }
}

export function parseXml(xml: string): unknown {
    try {
        return parser.parse(xml)
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        throw new XmlParseError(message)
    }
}
