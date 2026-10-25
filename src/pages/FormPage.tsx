import { CassetteForm } from '../components/CassetteForm';
import { useToast } from '../components/Toast';
import type { CollectionApi } from '../hooks/useCollection';
import { href, navigate } from '../hooks/useHashRoute';
import { emptyInput, toInput } from '../lib/collection';
import { NotFoundPage } from './NotFoundPage';

interface Props {
  api: CollectionApi;
  /** Ohne ID wird eine neue Kassette angelegt. */
  id?: string;
}

export function FormPage({ api, id }: Props) {
  const notify = useToast();
  const existing = id ? api.cassettes.find((c) => c.id === id) : undefined;

  if (id && !existing) {
    return <NotFoundPage text="Diese Kassette gibt es in deiner Sammlung nicht (mehr)." />;
  }

  const back = existing ? `/sammlung/${encodeURIComponent(existing.id)}` : '/sammlung';

  return (
    <div className="narrow">
      <p className="breadcrumb">
        <a href={href(back)}>
          <span aria-hidden="true">←</span> {existing ? 'Zurück zur Kassette' : 'Zurück zur Sammlung'}
        </a>
      </p>
      <h1 tabIndex={-1}>{existing ? 'Kassette bearbeiten' : 'Kassette erfassen'}</h1>
      <p className="page-head__lead">
        {existing
          ? `Du bearbeitest „${existing.title}“.`
          : 'Nur der Titel ist Pflicht. Alles andere kannst du jederzeit ergänzen.'}
      </p>
      <CassetteForm
        key={existing?.id ?? 'neu'}
        initial={existing ? toInput(existing) : emptyInput()}
        submitLabel={existing ? 'Änderungen speichern' : 'Kassette speichern'}
        onCancel={() => navigate(back)}
        onSubmit={(input) => {
          if (existing) {
            api.update(existing.id, input);
            notify('Änderungen gespeichert.');
            navigate(`/sammlung/${encodeURIComponent(existing.id)}`);
          } else {
            const created = api.add(input);
            notify(`„${created.title}“ wurde zur Sammlung hinzugefügt.`);
            navigate(`/sammlung/${encodeURIComponent(created.id)}`);
          }
        }}
      />
    </div>
  );
}
