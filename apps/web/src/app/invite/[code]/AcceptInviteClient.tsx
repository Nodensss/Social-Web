"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptInviteClient({ code }: { code: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const accept = async () => {
      try {
        const res = await fetch("/api/family/invites/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Ошибка при принятии приглашения");
        }

        setStatus("success");
        setTimeout(() => {
          router.push("/");
          router.refresh();
        }, 1500);
      } catch (e) {
        setStatus("error");
        setErrorMessage(e instanceof Error ? e.message : "Неизвестная ошибка");
      }
    };

    accept();
  }, [code, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      {status === "loading" && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-toy-red"></div>
          <p className="text-toy-ink/70">Присоединяемся к семье...</p>
        </>
      )}
      {status === "error" && (
        <div className="text-center space-y-4">
          <div className="text-4xl">❌</div>
          <p className="text-red-600 font-medium">{errorMessage}</p>
          <button
            onClick={() => router.push("/")}
            className="text-toy-red hover:underline"
          >
            На главную
          </button>
        </div>
      )}
      {status === "success" && (
        <div className="text-center space-y-4">
          <div className="text-4xl">✅</div>
          <p className="text-green-600 font-medium">Вы успешно присоединились к семье!</p>
          <p className="text-sm text-toy-ink/70">Перенаправляем...</p>
        </div>
      )}
    </div>
  );
}
