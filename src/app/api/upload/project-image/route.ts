import { type NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { auth } from '~/server/auth';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File too large. Maximum size is 5MB.'
      }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename with user ID and timestamp
    const fileExtension = file.name.split('.').pop() ?? 'jpg';
    const fileName = `${session.user.id}-${Date.now()}.${fileExtension}`;

    // Create uploads directory for project images
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'projects');

    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch {
      // Directory might already exist, which is fine
    }

    // Write file to uploads directory
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Create public URL for the uploaded file
    const imageUrl = `/uploads/projects/${fileName}`;

    // NOTE: We do NOT update the user profile here - this is just for project images

    return NextResponse.json({
      success: true,
      imageUrl,
      message: 'Project image uploaded successfully'
    });

  } catch (error) {
    console.error('Project image upload error:', error);
    return NextResponse.json({
      error: 'Failed to upload image. Please try again.'
    }, { status: 500 });
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
