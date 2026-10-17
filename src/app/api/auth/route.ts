import { NextResponse } from "next/server";
import {
  getUserById,
  loginUser,
  quickFanLogin,
  registerUser,
  updateUserProfile,
} from "@/lib/user-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Falta userId" }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error al obtener perfil" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body?.action;

    if (action === "quick") {
      const { name, favoriteTeam } = body;
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          { error: "Por favor ingresa tu nombre o apodo" },
          { status: 400 }
        );
      }
      const res = await quickFanLogin(name, favoriteTeam || "CAR");
      return NextResponse.json(res);
    }

    if (action === "register") {
      const { name, email, password, favoriteTeam } = body;
      if (!email || !password || !name) {
        return NextResponse.json(
          { error: "Todos los campos son obligatorios" },
          { status: 400 }
        );
      }
      const res = await registerUser(name, email, password, favoriteTeam || "CAR");
      return NextResponse.json(res);
    }

    if (action === "login") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json(
          { error: "Correo y contraseña son requeridos" },
          { status: 400 }
        );
      }
      const res = await loginUser(email, password);
      return NextResponse.json(res);
    }

    if (action === "update") {
      const { userId, updates } = body;
      if (!userId || !updates) {
        return NextResponse.json(
          { error: "Parámetros insuficientes para actualizar" },
          { status: 400 }
        );
      }
      const updatedUser = await updateUserProfile(userId, updates);
      return NextResponse.json({ user: updatedUser });
    }

    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Error en el servicio de autenticación" },
      { status: 400 }
    );
  }
}
