import { NextRequest, NextResponse } from 'next/server';

// For now, this stores bookings in memory (mock)
// Later, we'll connect this to PostgreSQL via Prisma
const bookingsStore: Record<string, any> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { event_id, name, email, mobile, pax, payment_method } = body;

    // Validate
    if (!event_id || !name || !email || !mobile || !pax) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate booking ID
    const booking_id = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Store booking
    bookingsStore[booking_id] = {
      booking_id,
      event_id,
      name,
      email,
      mobile,
      pax,
      payment_method,
      created_at: new Date().toISOString(),
      status: 'confirmed',
    };

    // TODO: Later, integrate with ReserveGo API
    // TODO: Later, send confirmation email via Nodemailer

    return NextResponse.json({
      success: true,
      booking_id,
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const bookingId = request.nextUrl.searchParams.get('booking_id');

    if (bookingId) {
      const booking = bookingsStore[bookingId];
      if (!booking) {
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, booking });
    }

    return NextResponse.json({
      success: true,
      bookings: Object.values(bookingsStore),
    });
  } catch (error) {
    console.error('Fetch bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}
