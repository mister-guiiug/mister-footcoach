import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input, Select } from './Input';

describe('Input', () => {
  it('renders without label', () => {
    const { container } = render(<Input placeholder="Type here" />);
    expect(container.querySelector('input')).toBeInTheDocument();
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders with label and links it to input via id', () => {
    render(<Input label="Name" />);
    const label = screen.getByText('Name');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'name');
  });

  it('uses explicit id when provided', () => {
    render(<Input label="X" id="my-input" />);
    expect(screen.getByLabelText('X')).toHaveAttribute('id', 'my-input');
  });

  it('renders error message', () => {
    render(<Input error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('applies error border class when error provided', () => {
    const { container } = render(<Input error="Oops" />);
    expect(container.querySelector('input')).toHaveClass('border-red-500');
  });

  it('does not apply error class when no error', () => {
    const { container } = render(<Input />);
    expect(container.querySelector('input')).not.toHaveClass('border-red-500');
  });

  it('accepts user input', async () => {
    const onChange = vi.fn();
    render(<Input onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('is disabled when disabled prop set', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts extra className', () => {
    const { container } = render(<Input className="my-class" />);
    expect(container.querySelector('input')).toHaveClass('my-class');
  });
});

describe('Select', () => {
  it('renders options', () => {
    render(
      <Select>
        <option value="a">A</option>
        <option value="b">B</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(
      <Select label="Team">
        <option>T1</option>
      </Select>
    );
    expect(screen.getByText('Team')).toBeInTheDocument();
  });

  it('uses explicit id', () => {
    render(
      <Select label="T" id="sel">
        <option>X</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toHaveAttribute('id', 'sel');
  });

  it('renders error message and applies error class', () => {
    const { container } = render(
      <Select error="Pick one">
        <option>X</option>
      </Select>
    );
    expect(screen.getByText('Pick one')).toBeInTheDocument();
    expect(container.querySelector('select')).toHaveClass('border-red-500');
  });

  it('no error class when no error', () => {
    const { container } = render(
      <Select>
        <option>X</option>
      </Select>
    );
    expect(container.querySelector('select')).not.toHaveClass('border-red-500');
  });

  it('is disabled when disabled prop set', () => {
    render(
      <Select disabled>
        <option>X</option>
      </Select>
    );
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('accepts extra className', () => {
    const { container } = render(
      <Select className="my-sel">
        <option>X</option>
      </Select>
    );
    expect(container.querySelector('select')).toHaveClass('my-sel');
  });
});
