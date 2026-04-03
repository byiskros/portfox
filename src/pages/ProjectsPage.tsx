import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import type { Tables } from '@/integrations/supabase/types';

type Case = Tables<'cases'>;

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('cases')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setCases(data || []);
        setLoading(false);
      });
  }, [user]);

  const createCase = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('cases')
      .insert({ user_id: user.id })
      .select()
      .single();
    if (error) {
      toast.error('Не удалось создать проект');
      return;
    }
    navigate(`/case/${data.id}`);
  };

  const deleteCase = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('cases').delete().eq('id', deleteId);
    if (error) {
      toast.error('Не удалось удалить');
    } else {
      setCases((prev) => prev.filter((c) => c.id !== deleteId));
      toast.success('Проект удалён');
    }
    setDeleteId(null);
  };

  if (loading) return <div className="text-sm text-muted-foreground">Загрузка…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Проекты</h1>
        <Button onClick={createCase} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Создать кейс
        </Button>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">Создайте свой первый кейс</p>
          <Button onClick={createCase} variant="outline" size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Новый кейс
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              className="group rounded-lg border border-border bg-card overflow-hidden cursor-pointer hover:border-foreground/20 transition-colors"
              onClick={() => navigate(`/case/${c.id}`)}
            >
              <div className="aspect-[16/10] bg-secondary">
                {c.cover_image_url && (
                  <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                  <span className={`text-xs ${c.status === 'published' ? 'text-success' : 'text-muted-foreground'}`}>
                    {c.status === 'published' ? 'Опубликован' : 'Черновик'}
                  </span>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button className="p-1 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); setDeleteId(c.id); }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Удалить
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить проект?</AlertDialogTitle>
            <AlertDialogDescription>Это действие нельзя отменить.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={deleteCase} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
