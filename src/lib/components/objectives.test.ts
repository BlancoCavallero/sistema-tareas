import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ObjectiveForm from './ObjectiveForm.svelte';

/**
 * Component coverage for the calendar objective create form: Spanish labels,
 * the three kind options, the create-action wiring and server error rendering.
 * Mirrors the TaskForm component tests (@testing-library/svelte, jsdom project).
 */

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
