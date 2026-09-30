import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { isTenantAdmin, requireMember } from '@/lib/server-auth';

/*
 * Tenant and user come from the verified session, never from the query or
 * body. These handlers used to take `tenantId` and `userId` from the request
 * with no authentication, so anyone could read, create or mark read the
 * notifications of any tenant. A `tenantId` in the request is still accepted,
 * but only when it is the caller's own. A member sees and changes their own
 * notifications; an admin of the tenant may act on everyone's.
 */

// GET notifications for a user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const member = await requireMember({ tenantId: url.searchParams.get('tenantId') });
    if (member instanceof NextResponse) return member;

    const tenantId = member.tenantId;
    const requestedUserId = url.searchParams.get('userId');
    const userId = isTenantAdmin(member) ? requestedUserId : member.userId;
    const status = url.searchParams.get('status') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

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
      console.error('Notifications fetch failed:', error);
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
    console.error('Notifications GET failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// POST - Create a new notification. Admins only, into their own tenant: a
// notification is shown in-app as coming from the product.
export async function POST(request: NextRequest) {
  try {
    const { tenantId: requestedTenantId, userId, title, message, type = 'info' } = await request.json();

    const admin = await requireMember({ admin: true, tenantId: requestedTenantId ?? null });
    if (admin instanceof NextResponse) return admin;
    const tenantId = admin.tenantId;

    if (!title || !message) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: title, message'
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
      console.error('Notification insert failed:', error);
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
    console.error('Notifications POST failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// PATCH - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const { notificationIds, tenantId: requestedTenantId, markAllAsRead, userId: requestedUserId } =
      await request.json();

    const member = await requireMember({ tenantId: requestedTenantId ?? null });
    if (member instanceof NextResponse) return member;
    const tenantId = member.tenantId;
    const isAdmin = isTenantAdmin(member);
    const userId = isAdmin ? requestedUserId : member.userId;

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
      // Mark specific notifications as read; a member only their own.
      query = query.in('id', notificationIds);
      if (!isAdmin) query = query.eq('user_id', member.userId);
    } else {
      return NextResponse.json({
        success: false,
        error: 'Must provide either notificationIds or markAllAsRead'
      }, { status: 400 });
    }

    const { data, error } = await query.select('*');

    if (error) {
      console.error('Notifications update failed:', error);
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
    console.error('Notifications PATCH failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
