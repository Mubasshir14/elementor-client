import React from 'react';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(
      <EmptyState
        title="No projects yet"
        description="Create a project to get started."
        actionLabel="Create project"
        actionHref="/projects/new"
      />,
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.getByText('Create a project to get started.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /create project/i })).toHaveAttribute('href', '/projects/new');
  });
});
