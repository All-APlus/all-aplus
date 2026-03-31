'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface Props {
  courseId: string;
}

export function NewConversationButton({ courseId }: Props) {
  const router = useRouter();

  const handleCreate = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        course_id: courseId,
        user_id: user.id,
        title: null,
      })
      .select()
      .single();

    if (data) {
      router.push(`/courses/${courseId}/chat/${data.id}`);
    }
  };

  return (
    <Button onClick={handleCreate}>
      <Plus className="h-4 w-4 mr-2" />
      새 대화
    </Button>
  );
}
