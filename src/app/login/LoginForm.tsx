"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useAuth } from "@/components/AuthProvider";
import { Logo, Stars } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { describeError } from "@/lib/api";
import { useAdminLogin } from "@/lib/mutations";

const HOME = "/tracking/overview";

/* Only same-origin paths are honoured, so ?next= cannot bounce the user to another site. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : HOME;
}

export function LoginForm() {
  const { session, ready, signIn } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const login = useAdminLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);

  // Already signed in (or just signed in): go to the app.
  useEffect(() => {
    if (ready && session?.role === "Admin") router.replace(next);
  }, [ready, session, next, router]);

  const emailErr = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    ? email.trim()
      ? "Revisá el email: falta algo (por ejemplo, nombre@dominio.com)."
      : "Escribí tu email."
    : null;
  const passErr = password ? null : "Escribí tu contraseña.";

  const submit = () => {
    setTried(true);
    if (emailErr || passErr || login.isPending) return;
    login.mutate({ email: email.trim(), password }, { onSuccess: signIn });
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-purple px-4 py-10">
      <Stars full />
      <motion.form
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        noValidate
        className="relative w-full max-w-[400px] rounded-[24px] bg-white p-7 shadow-[0_24px_64px_rgba(20,18,90,0.35)] sm:p-8"
      >
        <Logo tone="dark" className="h-[30px] w-auto" />
        <h1 className="mt-6 text-[26px] leading-[1.1] font-black tracking-[-0.025em] text-ink">Back Office</h1>
        <p className="mt-1.5 text-[14px] leading-[1.5] font-medium text-ink-60">
          Trackeo y moderación de Over It. Solo para el equipo.
        </p>
        <div className="mt-6 space-y-4">
          <Field
            label="Email"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={tried ? emailErr : null}
            placeholder="nombre@dominio.com"
          />
          <Field
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={tried ? passErr : null}
          />
        </div>
        {login.isError && (
          <p
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-[12px] bg-bad-bg px-3 py-2.5 text-[13px] font-bold text-bad"
          >
            <Icon.alert size={15} className="mt-px shrink-0" />
            {describeError(login.error)}
          </p>
        )}
        <Button type="submit" variant="primary" loading={login.isPending} className="mt-6 w-full">
          Entrar
        </Button>
        <div className="mt-5 flex items-start gap-2 rounded-[12px] bg-bo-soft px-3 py-2.5 shadow-[inset_0_0_0_1px_#EAE7E0]">
          <Icon.lock size={15} className="mt-0.5 shrink-0 text-ink-60" />
          <p className="text-[12px] leading-[1.45] font-medium text-ink-60">
            Solo cuentas con rol de administrador. Cada acción queda registrada en el Historial.
          </p>
        </div>
        <Badge tone="lime" className="absolute top-7 right-6">
          Interno
        </Badge>
      </motion.form>
    </div>
  );
}
