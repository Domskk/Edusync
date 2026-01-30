import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useFileUpload() {
    const [upLoading, setUpLoading] = useState(false);

    const uploadFile = async (file:File, submissionId: string) => {
        setUpLoading(true);
        try {
            const { data, error } = await supabase.storage
            .from('submissions')
            .upload(`${submissionId}/${file.name}`, file);
            if (error) throw error;
            await supabase.from('files').insert({
                submission_id: submissionId,
                file_path: data.path,
                file_name: file.name,
            });
            return data.path;
        } catch (error) {
            console.error('Error uploading file:', error);
            return null;
        } finally {
            setUpLoading(false);
        }
    };
    return { uploadFile, upLoading };
}