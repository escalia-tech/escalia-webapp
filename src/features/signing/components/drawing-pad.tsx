"use client";

import { useEffect, useRef } from "react";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

const WIDTH = 480;
const HEIGHT = 140;

/** An optional hand-drawn signature (FR-DOC-02 BR-4): a small canvas whose PNG travels with the typed name. */
export function DrawingPad({ onChange }: { onChange: (dataUrl: string) => void }) {
  const t = useTranslations("signing");
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const touched = useRef(false);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context) {
      context.lineWidth = 2;
      context.lineCap = "round";
      context.strokeStyle = "#111";
    }
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - box.left) / box.width) * WIDTH,
      y: ((event.clientY - box.top) / box.height) * HEIGHT,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const { x, y } = point(event);
    context.beginPath();
    context.moveTo(x, y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!drawing.current || !context) return;
    const { x, y } = point(event);
    context.lineTo(x, y);
    context.stroke();
    touched.current = true;
  }

  function stop(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    drawing.current = false;
    if (touched.current) onChange(event.currentTarget.toDataURL("image/png"));
  }

  function clear() {
    const element = canvas.current;
    element?.getContext("2d")?.clearRect(0, 0, WIDTH, HEIGHT);
    touched.current = false;
    onChange("");
  }

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvas}
        width={WIDTH}
        height={HEIGHT}
        aria-label={t("sign.drawing")}
        className="bg-background w-full max-w-md touch-none rounded-md border"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div>
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          {t("sign.clearDrawing")}
        </Button>
      </div>
    </div>
  );
}
