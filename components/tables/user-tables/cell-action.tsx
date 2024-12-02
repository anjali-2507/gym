'use client';
import { Button } from '@/components/ui/button';
import { User } from '@/constants/data';
import { Edit, MoreHorizontal, Trash } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface CellActionProps {
  data: User;
}

