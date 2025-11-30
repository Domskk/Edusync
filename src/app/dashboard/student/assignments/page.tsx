'use client'
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/Card';
import { useFileUpload } from '@/lib/hooks/useFileUpload';

export default function StudentAssignments() {
  interface Assignment {
    id: string;
    title: string;
    description?: string;
    due_date: string;
    class_id?: string;
  }

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const searchParams = useSearchParams();
  const classId = searchParams.get('classId');
  const { uploadFile, upLoading } = useFileUpload();

  useEffect(() => {
    if (classId) {
      const fetchAssignments = async () => {
        const { data } = await supabase.from('assignments').select('*').eq('class_id', classId);
        setAssignments(data || []);
      };
      fetchAssignments();
    }
  }, [classId]);

  const handleSubmit = async (assignmentId: string) => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: submission } = await supabase.from('submissions').insert({
          assignment_id: assignmentId,
          student_id: user?.id,
        }).select('id').single();
        await uploadFile(file, submission?.id);
      }
    };
    fileInput.click();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Assignments</h2>
      <Card>
        {assignments.map((assignment) => (
          <div key={assignment.id} className="p-4 border-b">
            <h3 className="text-lg font-semibold">{assignment.title}</h3>
            <p>{assignment.description}</p>
            <p>Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
            <button
              onClick={() => handleSubmit(assignment.id)}
              disabled={upLoading}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              {upLoading ? 'Uploading...' : 'Submit'}
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}