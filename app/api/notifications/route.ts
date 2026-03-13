import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET notifications for a user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing tenantId parameter'
      }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch notifications'
      }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'unread')
      .eq('user_id', userId || '');

    return NextResponse.json({
      success: true,
      data: {
        notifications: notifications || [],
        unreadCount: unreadCount || 0,
        totalCount: notifications?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const { tenantId, userId, title, message, type = 'info' } = await request.json();

    if (!tenantId || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: tenantId, title, message'
      }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        tenant_id: tenantId,
        user_id: userId || null,
        title,
        message,
        type,
        status: 'unread'
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create notification'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: notification
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { notificationIds, tenantId, markAllAsRead, userId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'Missing tenantId'
      }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({
        success: false,
        error: 'Database not available'
      }, { status: 500 });
    }

    let query = supabase
      .from('notifications')
      .update({ status: 'read' })
      .eq('tenant_id', tenantId);

    if (markAllAsRead && userId) {
      // Mark all notifications as read for specific user
      query = query.eq('user_id', userId);
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      query = query.in('id', notificationIds);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Must provide either notificationIds or markAllAsRead with userId'
      }, { status: 400 });
    }

    const { data, error } = await query.select('*');

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update notifications'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        updatedCount: data?.length || 0,
        updatedNotifications: data || []
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 