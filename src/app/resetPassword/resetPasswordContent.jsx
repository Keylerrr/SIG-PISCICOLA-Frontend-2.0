"use client";

//Falta validar el token, igual el backend lo valida internamente

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { AlertCircleIcon } from "lucide-react"
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldGroup,
    FieldLabel
} from "@/components/ui/field";
import { useSearchParams } from 'next/navigation';

export default function ResetPasswordContent() {
    const [loginError, setResetError] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const [pas1, setPas1] = useState('');
    const [pas2, setPas2] = useState('');
    const searchParams = useSearchParams();
    const uuid = searchParams.get("uid");
    const token = searchParams.get("token");
    const [success, setSuccess] = useState(false);
    useEffect(() => {
        if (success) {
            setTimeout(() => {
                router.push('/');
            }, 2000);
        }
    }, [success]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!uuid) {
            console.error("No hay UUID en la URL");
            setResetError(true);
            return;
        }

        setResetError(false);
        setIsLoading(true);

        if (pas1 != pas2) {
            setIsLoading(false);
            setResetError(true);
            return;
        }

        try {
            const res = await fetch(
                `https://backend-pongase-trucha.onrender.com/api/auth/reset-password/${uuid}/${token}/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        new_password: pas1,
                    }),
                }
            );

            const data = await res.json();

            if (!res.ok) {
                setIsLoading(false);
                setResetError(true);
                return;
            }
            setSuccess(true);
        } catch (error) {
            console.error("Error en el login:", error);
            setResetError(true);
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
            {success && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4">
                        <p className="mt-2 font-medium text-slate-700 text-center">
                            Contraseña cambiada exitosamente!! :)
                        </p>

                        <Button
                            onClick={() => router.push('/')}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            Ir al inicio
                        </Button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
                        <p className="mt-4 font-medium text-slate-700">Cambiando contraseña...</p>
                    </div>
                </div>
            )}


            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <div className="flex justify-center mb-3">
                    <img src="./images/PongaseTrucha.png" alt="Logo" className="w-30 h-30" />
                </div>

                <h1 className="text-3xl font-bold text-center mb-2 text-slate-800">Póngase Trucha</h1>
                <p className="text-center text-slate-600 mb-4">Gestión de Acuicultura</p>

                {loginError && (
                    <Alert variant="destructive" className="max-w-md mb-4">
                        <AlertCircleIcon />
                        <AlertTitle>Cambio de contraseña fallido :(</AlertTitle>
                        <AlertDescription>
                            Asegurese que las contraseñas sean igual o intentelo mas tarde.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <FieldGroup className="space-y-5">
                        <Field>
                            <FieldLabel htmlFor="password" className="text-xl">Ingrese su nueva contraseña</FieldLabel>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2 w-5 h-5 text-slate-400 z-10" />
                                <Input
                                    id="password1"
                                    type="password"
                                    autoComplete="off"
                                    placeholder="••••••••"
                                    value={pas1}
                                    onChange={(e) => setPas1(e.target.value)}
                                    required
                                    className="pl-10 text-black border-slate-300 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="password" className="text-xl">Confirme la contraseña</FieldLabel>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2 w-5 h-5 text-slate-400 z-10" />
                                <Input
                                    id="password2"
                                    type="password"
                                    autoComplete="off"
                                    placeholder="••••••••"
                                    value={pas2}
                                    onChange={(e) => setPas2(e.target.value)}
                                    required
                                    className="pl-10 text-black border-slate-300 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </Field>

                        <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-lg font-medium transition-all"
                        >
                            Cambiar contraseña
                        </Button>
                    </FieldGroup>
                </form>
            </div>
        </div>
    );
}