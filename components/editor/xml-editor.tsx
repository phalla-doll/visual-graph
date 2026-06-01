"use client";

import { useRef } from "react";
import { RiFolderOpenLine, RiPlayLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useGraphStore } from "@/store/graph-store";

export function XmlEditor() {
  const xml = useGraphStore((s) => s.xml);
  const parseError = useGraphStore((s) => s.parseError);
  const setXml = useGraphStore((s) => s.setXml);
  const parse = useGraphStore((s) => s.parse);
  const parseDocuments = useGraphStore((s) => s.parseDocuments);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onUploadClick() {
    fileInputRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    const texts = await Promise.all(files.map((f) => f.text()));
    if (texts.length === 1) {
      setXml(texts[0]);
    } else {
      parseDocuments(texts);
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Paste an EDMX document</CardTitle>
        <CardDescription>
          Drop in an OData $metadata response, or upload one or more .edmx files to merge entities
          across schemas.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Textarea
          value={xml}
          onChange={(e) => setXml(e.target.value)}
          placeholder={'<edmx:Edmx xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx" Version="4.0">…'}
          className="min-h-[280px] font-mono text-xs"
          spellCheck={false}
        />
        {parseError && <p className="text-sm text-destructive">{parseError}</p>}
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml,.edmx,application/xml,text/xml"
          onChange={onFile}
          multiple
          hidden
        />
      </CardContent>
      <CardFooter className="gap-2">
        <Button variant="outline" onClick={onUploadClick}>
          <RiFolderOpenLine /> Upload file(s)
        </Button>
        <Button onClick={parse} disabled={!xml.trim()}>
          <RiPlayLine /> Parse
        </Button>
      </CardFooter>
    </Card>
  );
}
