import React from 'react';
import { VideoMessage } from './VideoMessage';
import { DiaryEntry } from '../types';

interface VideoMessageModalProps {
  entry: DiaryEntry;
  username?: string;
  isVisible: boolean;
  onClose: () => void;
}

export const VideoMessageModal: React.FC<VideoMessageModalProps> = ({
  entry,
  username,
  isVisible,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <VideoMessage 
      entry={entry}
      username={username}
      onClose={onClose}
      isModal={true}
    />
  );
};