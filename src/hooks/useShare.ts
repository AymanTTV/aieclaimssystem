import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getShares, createShare, updateShare, deleteShare } from '../services/share.service';
import { ShareRecord } from '../types/share';

export function useShares() {
  const queryClient = useQueryClient();
  const query = useQuery<ShareRecord[]>('shares', getShares);

  const add = useMutation(createShare, { onSuccess: () => queryClient.invalidateQueries('shares') });
  const edit = useMutation(
    ({ id, data }: { id: string; data: ShareRecord }) => updateShare(id, data),
    { onSuccess: () => queryClient.invalidateQueries('shares') }
  );
  const remove = useMutation(deleteShare, { onSuccess: () => queryClient.invalidateQueries('shares') });

  return { ...query, add, edit, remove };
}