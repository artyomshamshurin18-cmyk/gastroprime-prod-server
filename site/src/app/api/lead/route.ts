import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { companyName, contactPerson, phone, notes } = body;

    if (!companyName || !contactPerson || !phone) {
      return NextResponse.json(
        { error: "Имя, телефон и компания обязательны" },
        { status: 400 }
      );
    }

    // Send to backend API
    const backendUrl = "http://localhost:3001/api/public/leads";
    const res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        contactPerson,
        phone,
        notes,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Backend error:", res.status, text);
      return NextResponse.json(
        { error: "Ошибка сервера. Попробуйте позже." },
        { status: 500 }
      );
    }

    const data = await res.json();

    // Also send email notification
    try {
      await fetch("http://localhost:3001/api/public/leads/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          contactPerson,
          phone,
          notes,
        }),
      });
    } catch (emailErr) {
      console.error("Email send error:", emailErr);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ success: true, dealId: data.dealId });
  } catch (err: any) {
    console.error("Lead API error:", err);
    return NextResponse.json(
      { error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
