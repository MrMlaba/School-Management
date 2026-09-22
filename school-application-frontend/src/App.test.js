import { render, screen } from '@testing-library/react';
import App from './App';

// A minimal smoke test: the app mounts (including its router, theme, and the
// homepage's own data fetching) without throwing, and the public nav bar's
// "Apply Online" button — present for every unauthenticated visitor — is on
// the page. Replaces the untouched CRA default, which checked for text this
// app never had ("learn react") and would fail regardless of whether the app
// actually worked.
test('renders the homepage without crashing', async () => {
  render(<App />);
  expect(await screen.findByText(/apply online/i)).toBeInTheDocument();
});





