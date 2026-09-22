import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import ObjectiveForm from './ObjectiveForm.svelte';
import ObjectiveGrid from './ObjectiveGrid.svelte';
import ObjectiveItem from './ObjectiveItem.svelte';
import ObjectiveList from './ObjectiveList.svelte';
import type { ObjectiveRow } from '$lib/server/objectives/repository';

/**
 * Component coverage for the calendar objective UI: Spanish labels on the
 * create form, the objective item (kind chips, derived status cue, edit/toggle/
 * delete actions), the list sections (upcoming/overdue/all split in memory)
 * and the read-only month grid (weekday headers, `aria-current="date"` on
 * today, no `role="grid"`, keyed chips per day, empty month). Mirrors the
 * TaskForm/TaskItem/TaskList component tests (@testing-library/svelte, jsdom
 * project).
 */

function objective(partial: Partial<ObjectiveRow> = {}): ObjectiveRow {
	return {
		id: 1,
		title: 'Parcial de álgebra',
		kind: 'exam',
		due_date: '2026-09-25',
		notes: null,
		done: false,
		completed_at: null,
		created_at: '2026-09-21T12:00:00.000Z',
		...partial
	};
}

describe('ObjectiveForm', () => {
	it('shows Spanish labels for the create form', () => {
		render(ObjectiveForm);
		expect(screen.getByLabelText('Título')).toBeTruthy();
		expect(screen.getByLabelText('Tipo')).toBeTruthy();
		expect(screen.getByLabelText('Fecha')).toBeTruthy();
		expect(screen.getByLabelText('Notas')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Crear objetivo' })).toBeTruthy();
	});

	it('offers the three objective kinds in Spanish, defaulting to Examen', () => {
		render(ObjectiveForm);
		const select = screen.getByLabelText('Tipo') as HTMLSelectElement;
		expect(select.value).toBe('exam');
		expect(screen.getByRole('option', { name: 'Examen' })).toBeTruthy();
		expect(screen.getByRole('option', { name: 'Vencimiento' })).toBeTruthy();
		expect(screen.getByRole('option', { name: 'Otro' })).toBeTruthy();
	});

	it('wires the fields and submits to the create action', () => {
		render(ObjectiveForm);
		const form = document.querySelector('form.objective-form') as HTMLFormElement;
		expect(form.method).toBe('post');
		expect(form.getAttribute('action')).toBe('?/create');
		expect((screen.getByLabelText('Título') as HTMLInputElement).name).toBe('title');
		expect((screen.getByLabelText('Tipo') as HTMLSelectElement).name).toBe('kind');
		expect((screen.getByLabelText('Fecha') as HTMLInputElement).name).toBe('due_date');
		expect((screen.getByLabelText('Notas') as HTMLTextAreaElement).name).toBe('notes');
	});

	it('renders the server validation message in Spanish', () => {
		render(ObjectiveForm, { props: { form: { message: 'El título es obligatorio.' } } });
		expect(screen.getByRole('alert').textContent).toBe('El título es obligatorio.');
	});
});

describe('ObjectiveItem', () => {
	it('renders title, Spanish kind chip, due date and derived status cue', () => {
		render(ObjectiveItem, {
			props: { objective: objective(), today: '2026-09-22' }
		});
		expect(screen.getByText('Parcial de álgebra')).toBeTruthy();
		expect(screen.getByText('Examen')).toBeTruthy();
		expect(screen.getByText('Próxima')).toBeTruthy();
		expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-25');
	});

	it('shows the "Vencida" text cue for an overdue objective, never color-only', () => {
		render(ObjectiveItem, {
			props: { objective: objective({ due_date: '2026-09-21' }), today: '2026-09-22' }
		});
		expect(screen.getByText('Vencida')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Marcar hecha' })).toBeTruthy();
	});

	it('shows "Completada" and Desmarcar for a done objective', () => {
		render(ObjectiveItem, {
			props: { objective: objective({ done: true }), today: '2026-09-22' }
		});
		expect(screen.getByText('Completada')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Desmarcar' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Marcar hecha' })).toBeNull();
	});

	it('labels each kind with its Spanish chip', () => {
		render(ObjectiveItem, {
			props: {
				objective: objective({ kind: 'deadline', title: 'Entrega TP' }),
				today: '2026-09-22'
			}
		});
		expect(screen.getByText('Vencimiento')).toBeTruthy();
		expect(screen.getByText('Entrega TP')).toBeTruthy();
	});

	it('wires toggle, edit and delete actions to the route actions', async () => {
		render(ObjectiveItem, {
			props: { objective: objective({ notes: 'Tema 4' }), today: '2026-09-22' }
		});
		const toggleForm = document.querySelector('form[action="?/toggle"]') as HTMLFormElement;
		const deleteForm = document.querySelector('form[action="?/delete"]') as HTMLFormElement;
		expect(toggleForm.method).toBe('post');
		expect(deleteForm.method).toBe('post');

		await fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
		const editForm = document.querySelector('form[action="?/edit"]') as HTMLFormElement;
		expect(editForm.method).toBe('post');
		expect((screen.getByLabelText('Título') as HTMLInputElement).value).toBe('Parcial de álgebra');
		expect((screen.getByLabelText('Notas') as HTMLTextAreaElement).value).toBe('Tema 4');
	});
});

describe('ObjectiveList', () => {
	it('splits the flat list into Próximas, Vencidas and Todas sections', () => {
		const list = [
			objective({ id: 1, title: 'Parcial de álgebra', due_date: '2026-09-25' }),
			objective({ id: 2, title: 'Entrega TP', kind: 'deadline', due_date: '2026-09-21' })
		];
		render(ObjectiveList, { props: { list, today: '2026-09-22' } });
		expect(screen.getByRole('region', { name: 'Próximas' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Vencidas' })).toBeTruthy();
		expect(screen.getByRole('region', { name: 'Todas' })).toBeTruthy();
		// Each item renders in its own section plus the all-view: 2 occurrences.
		expect(screen.getAllByText('Parcial de álgebra').length).toBe(2);
		expect(screen.getAllByText('Entrega TP').length).toBe(2);
		expect(screen.getAllByText('Vencida').length).toBe(2);
	});

	it('places each objective only in its matching section', () => {
		const list = [
			objective({ id: 1, title: 'Solo próxima', due_date: '2026-09-25' }),
			objective({ id: 2, title: 'Solo vencida', due_date: '2026-09-21' })
		];
		render(ObjectiveList, { props: { list, today: '2026-09-22' } });
		const upcoming = within(screen.getByRole('region', { name: 'Próximas' }));
		const overdue = within(screen.getByRole('region', { name: 'Vencidas' }));
		expect(upcoming.getByText('Solo próxima')).toBeTruthy();
		expect(upcoming.queryByText('Solo vencida')).toBeNull();
		expect(overdue.getByText('Solo vencida')).toBeTruthy();
		expect(overdue.queryByText('Solo próxima')).toBeNull();
	});

	it('shows Spanish empty states when sections have no objectives', () => {
		render(ObjectiveList, { props: { list: [], today: '2026-09-22' } });
		expect(screen.getByText('No hay objetivos próximos.')).toBeTruthy();
		expect(screen.getByText('No hay objetivos vencidos.')).toBeTruthy();
		expect(screen.getByText('No hay objetivos todavía.')).toBeTruthy();
	});
});

describe('ObjectiveGrid', () => {
	// September 2026: 1st is a Tuesday (offset 1), 30 days. Today falls inside.
	const month = [
		objective({ id: 1, title: 'Parcial de álgebra', due_date: '2026-09-25' }),
		objective({ id: 2, title: 'Entrega TP', kind: 'deadline', due_date: '2026-09-25' }),
		objective({ id: 3, title: 'Trámite', kind: 'other', due_date: '2026-09-10' })
	];

	function cellForDay(day: string): HTMLElement | null {
		const time = document.querySelector(`time[datetime="${day}"]`);
		return time?.closest('.grid-cell') ?? null;
	}

	it('renders the Monday-first weekday header row', () => {
		render(ObjectiveGrid, {
			props: { month: [], today: '2026-09-22', monthKey: '2026-09' }
		});
		const headers = Array.from(document.querySelectorAll('.grid-weekday')).map(
			(el) => el.textContent
		);
		expect(headers).toEqual(['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']);
	});

	it('marks only today with aria-current="date"', () => {
		render(ObjectiveGrid, {
			props: { month: [], today: '2026-09-22', monthKey: '2026-09' }
		});
		const current = document.querySelectorAll('[aria-current="date"]');
		expect(current.length).toBe(1);
		expect(current[0]?.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-22');
	});

	it('renders a semantic display grid, never role="grid" or gridcell', () => {
		render(ObjectiveGrid, {
			props: { month: [], today: '2026-09-22', monthKey: '2026-09' }
		});
		expect(document.querySelector('[role="grid"]')).toBeNull();
		expect(document.querySelector('[role="gridcell"]')).toBeNull();
		expect(document.querySelectorAll('.month-grid time.day-number').length).toBe(30);
	});

	it('renders keyed chips per day with kind and title', () => {
		render(ObjectiveGrid, {
			props: { month, today: '2026-09-22', monthKey: '2026-09' }
		});
		const sameDay = cellForDay('2026-09-25');
		const otherDay = cellForDay('2026-09-10');
		expect(sameDay?.querySelectorAll('.chip').length).toBe(2);
		expect(otherDay?.querySelectorAll('.chip').length).toBe(1);
		expect(within(sameDay as HTMLElement).getByText('Parcial de álgebra')).toBeTruthy();
		expect(within(sameDay as HTMLElement).getByText('Entrega TP')).toBeTruthy();
		expect(within(sameDay as HTMLElement).getByText('Examen')).toBeTruthy();
		expect(within(sameDay as HTMLElement).getByText('Vencimiento')).toBeTruthy();
		expect(within(otherDay as HTMLElement).getByText('Trámite')).toBeTruthy();
	});

	it('shows a clear empty state and empty day cells when the month has no objectives', () => {
		render(ObjectiveGrid, {
			props: { month: [], today: '2026-09-22', monthKey: '2026-09' }
		});
		expect(screen.getByText('No hay objetivos este mes.')).toBeTruthy();
		expect(document.querySelectorAll('.month-grid .grid-cell:not(.blank)').length).toBe(30);
		expect(document.querySelectorAll('.month-grid .chip').length).toBe(0);
	});
});
