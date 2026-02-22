'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserWithRelations } from '@/lib/types';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatTimestamp, formatRelativeTime, getInitials } from '@/lib/utils';
import { sendMessage, resolveMessage } from '@/app/dashboard/deals/[id]/actions';

interface CommunicationThreadProps {
  dealId: string;
  messages: any[];
  user: UserWithRelations;
  canSend: boolean;
  canSendAction: boolean;
}

export function CommunicationThread({ dealId, messages, user, canSend, canSendAction }: CommunicationThreadProps) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [responseRequested, setResponseRequested] = useState(false);

  const sorted = [...messages].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSend = async () => {
    if (!content.trim()) return;
    setSending(true);
    try {
      const type = responseRequested ? 'action_required' : 'note';
      await sendMessage(dealId, content, type);
      setContent('');
      setResponseRequested(false);
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const handleResolve = async (messageId: string) => {
    await resolveMessage(messageId);
    router.refresh();
  };

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-surface-200">
        <CardHeader title="Communication" description={`${messages.length} messages`} />
      </div>

      {/* Messages */}
      <div className="max-h-[500px] overflow-y-auto divide-y divide-surface-100">
        {sorted.length === 0 ? (
          <p className="text-sm text-surface-500 p-4">No messages yet.</p>
        ) : (
          sorted.map((msg) => {
            const isOwn = msg.sender_id === user.id;
            const isAction = msg.message_type === 'action_required';
            const viewedBy = msg.views?.map((v: any) => `${v.viewer?.first_name} ${v.viewer?.last_name}`).join(', ');

            return (
              <div key={msg.id} className={`p-4 ${isAction && !msg.is_resolved ? 'bg-amber-50/50' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-surface-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-surface-600">
                      {getInitials(msg.sender?.first_name || '', msg.sender?.last_name || '')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-surface-900">
                        {msg.sender?.first_name} {msg.sender?.last_name}
                      </span>
                      {isAction && (
                        <Badge variant={msg.is_resolved ? 'success' : 'warning'}>
                          {msg.is_resolved ? 'Resolved' : 'Response Requested'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-surface-700 mt-1 whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-surface-400" title={formatTimestamp(msg.created_at)}>
                        {formatTimestamp(msg.created_at)} ({formatRelativeTime(msg.created_at)})
                      </span>
                      {viewedBy && <span className="text-xs text-surface-400">Viewed by {viewedBy}</span>}
                      {isAction && !msg.is_resolved && isOwn && (
                        <button
                          onClick={() => handleResolve(msg.id)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      {canSend && (
        <div className="p-4 border-t border-surface-200">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type a message..."
            rows={3}
            className="input-base mb-3 text-sm"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={handleSend} loading={sending} disabled={!content.trim()}>
              Send Comment
            </Button>
            {canSendAction && (
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={responseRequested}
                  onChange={(e) => setResponseRequested(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-surface-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-surface-600">Response Requested</span>
              </label>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
