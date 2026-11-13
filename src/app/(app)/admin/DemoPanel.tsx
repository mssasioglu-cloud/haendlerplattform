"use client";
import { useActionState } from "react";
import { loadDemoData, removeDemoData } from "@/app/actions/demo";
import { SubmitButton } from "@/components/SubmitButton";

export function DemoPanel({ demoDealers }: { demoDealers: number }) {
  const [loadState, load] = useActionState(loadDemoData, null);
  const [removeState, remove] = useActionState(removeDemoData, null);
  const state = removeState ?? loadState;
  const loaded = demoDealers > 0;
  return (
    <section className="card mb-5 overflow-hidden">
      <div className="hatch h-1.5" aria-hidden />
      <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="h2">Demodaten</h2>
          <p className="mt-1 text-sm text-muted">
            Füllt alle Reiter mit Beispiel-Händlern, Fahrzeugen, Nachrichten, Geboten, Gesuchen und Chatbeiträgen, damit
            Sie sehen, wie die Plattform im Betrieb aussieht. Die Beispiel-Händler sind mit „(Demo)“ gekennzeichnet und
            für alle freigeschalteten Händler sichtbar. Vor dem echten Start bitte wieder entfernen.
          </p>
          <p className="num mt-2 text-xs">
            Status: {loaded ? `${demoDealers} Demo-Händler geladen` : "keine Demodaten geladen"}
          </p>
          {state?.error && <p className="notice notice-error mt-3" role="alert">{state.error}</p>}
          {state?.ok && <p className="notice notice-ok mt-3" role="status">{state.ok}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <form action={load}>
            <SubmitButton disabled={loaded} pendingText="Wird geladen …">Demodaten laden</SubmitButton>
          </form>
          <form action={remove}>
            <SubmitButton className="btn btn-danger" disabled={!loaded} pendingText="Wird entfernt …">Demodaten entfernen</SubmitButton>
          </form>
        </div>
      </div>
    </section>
  );
}
