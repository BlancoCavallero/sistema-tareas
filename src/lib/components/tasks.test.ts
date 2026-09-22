import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/svelte';
import TaskForm from './TaskForm.svelte';
import TaskItem from './TaskItem.svelte';
import TaskList from './TaskList.svelte';
import type { CompletionRow, TaskWithDone } from '$lib/server/tasks/repository';

/**
 * Component coverage (design 5.6): the tasks UI renders from server props with
 * Spanish labels — create form, list states, completion actions and history.
 */

function task(partial: Partial<TaskWithDone> = {}): TaskWithDone {
	return {
		id: 1,
		title: 'Estudiar matemática',
		created_at: '2026-09-21T12:00:00.000Z',
		next_due: '2026-09-21',
		recurrence_type: null,
		recurrence_dow: null,
		recurrence_dom: null,
		recurrence_mode: '++',
		recurrence_anchor: null,
		done: false,
		...partial
	};
}

describe('TaskForm', () => {
	it('shows Spanish labels for the create form', () => {
		render(TaskForm);
		expect(screen.getByLabelText('Título')).toBeTruthy();
		expect(screen.getByLabelText('Repetición')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeTruthy();
	});

	it('reveals recurrence options for each type', async () => {
		render(TaskForm);
		const select = screen.getByLabelText('Repetición') as HTMLSelectElement;

		select.value = 'weekly';
		await fireEvent.change(select);
		expect(screen.getByLabelText('Día de la semana')).toBeTruthy();

		select.value = 'monthly';
		await fireEvent.change(select);
		expect(screen.getByLabelText('Día del mes (1-31)')).toBeTruthy();

		select.value = 'daily';
		await fireEvent.change(select);
		expect(screen.getByLabelText('Modo')).toBeTruthy();
		expect(
			screen.getByRole('option', { name: 'Fija (++): avanza al próximo día hábil' })
		).toBeTruthy();
		expect(
			screen.getByRole('option', { name: 'Relativa (.+): cuenta desde la fecha completada' })
		).toBeTruthy();
	});
});

describe('TaskItem', () => {
	it('renders title, due date and Spanish state for a pending task', () => {
		render(TaskItem, { props: { task: task(), history: [] } });
		expect(screen.getByText('Estudiar matemática')).toBeTruthy();
		expect(screen.getByText('Vence: 2026-09-21')).toBeTruthy();
		expect(screen.getByText('Pendiente')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Completar' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Editar' })).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Eliminar' })).toBeTruthy();
	});

	it('shows Deshacer for a done task and hides the complete action', () => {
		render(TaskItem, { props: { task: task({ done: true }), history: [] } });
		expect(screen.getByText('Completada')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Deshacer' })).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Completar' })).toBeNull();
	});

	it('labels a recurring task with its Spanish badge', () => {
		render(TaskItem, {
			props: {
				task: task({
					recurrence_type: 'weekly',
					recurrence_dow: 1,
					recurrence_mode: '++'
				}),
				history: []
			}
		});
		expect(screen.getByText('Semanal (Lunes) (++)')).toBeTruthy();
	});

	it('expands the completion history in Spanish', async () => {
		const history: CompletionRow[] = [
			{ id: 1, task_id: 1, occurrence_date: '2026-09-19', completed_at: 'x' },
			{ id: 2, task_id: 1, occurrence_date: '2026-09-21', completed_at: 'x' }
		];
		render(TaskItem, { props: { task: task(), history } });
		await fireEvent.click(screen.getByRole('button', { name: 'Historial (2)' }));
		expect(screen.getByText('2026-09-19')).toBeTruthy();
		expect(screen.getByText('2026-09-21')).toBeTruthy();
		await fireEvent.click(screen.getByRole('button', { name: 'Ocultar historial' }));
		expect(screen.queryByText('2026-09-19')).toBeNull();
	});

	it('shows the empty-history message in Spanish', async () => {
		render(TaskItem, { props: { task: task(), history: [] } });
		await fireEvent.click(screen.getByRole('button', { name: 'Historial (0)' }));
		expect(screen.getByText('Sin completados aún.')).toBeTruthy();
	});
});

describe('TaskList', () => {
	it('renders every task of the page and the create form', () => {
		const tasks = [
			task({ id: 1, title: 'Primera' }),
			task({ id: 2, title: 'Segunda', done: true })
		];
		render(TaskList, { props: { tasks, history: [] } });
		expect(screen.getByText('Primera')).toBeTruthy();
		expect(screen.getByText('Segunda')).toBeTruthy();
		expect(screen.getByRole('button', { name: 'Crear tarea' })).toBeTruthy();
	});

	it('shows the Spanish empty state when there are no tasks', () => {
		render(TaskList, { props: { tasks: [], history: [] } });
		expect(screen.getByText('No hay tareas todavía.')).toBeTruthy();
	});

	it('passes the per-task history to each item', async () => {
		const history: CompletionRow[] = [
			{ id: 1, task_id: 1, occurrence_date: '2026-09-20', completed_at: 'x' }
		];
		render(TaskList, { props: { tasks: [task({ id: 1 })], history } });
		await fireEvent.click(screen.getByRole('button', { name: 'Historial (1)' }));
		expect(screen.getByText('2026-09-20')).toBeTruthy();
	});
});
