/**
 * Smoke test: the whole app renders against the fake native module defined in
 * jest.setup.js (a fresh install: no destination saved).
 *
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/App';

/** All text rendered anywhere in the tree, joined. */
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAll(node => typeof node.props.children === 'string')
    .map(node => node.props.children)
    .join('\n');
}

test('renders the home screen after loading settings', async () => {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  // async act waits for the native-module promises to resolve and re-render.
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(<App />);
  });
  const text = allText(tree);
  expect(text).toContain('Notify-Me');
  expect(text).toContain("Let's get you set up"); // hero for "no destination yet"
  expect(text).toContain('Finish setting up');
  expect(text).toContain('No activity yet');
});
