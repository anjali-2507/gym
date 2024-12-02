'use client';
import { OurFileRouter } from '@/app/api/uploadthing/core';
import { UploadDropzone } from '@uploadthing/react';
import { Trash } from 'lucide-react';
import Image from 'next/image';
import { UploadFileResponse } from 'uploadthing/client';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';

interface ImageUploadProps {
  onChange?: any;
  onRemove: (value: UploadFileResponse[]) => void;
  value: UploadFileResponse[];
}

export default function FileUpload({
  onChange,
  onRemove,
  value
}: ImageUploadProps) {
  const { toast } = useToast();
  const onDeleteFile = (key: string) => {
    const files = value;
    let filteredFiles = files.filter((item) => item.key !== key);
    onRemove(filteredFiles);
  };
  const onUpdateFile = (newFiles: UploadFileResponse[]) => {
    onChange([...value, ...newFiles]);
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        {!!value.length &&
          value?.map((item) => (
            <div
              key={item.key}
              className="relative h-[200px] w-[200px] overflow-hidden rounded-md"
            >
              <div className="absolute right-2 top-2 z-10">
                <Button
                  type="button"
                  onClick={() => onDeleteFile(item.key)}
                  variant="destructive"
                  size="sm"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <Image
                  fill
                  className="object-cover"
                  alt="Image"
                  src={item.fileUrl || ''}
                />
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
