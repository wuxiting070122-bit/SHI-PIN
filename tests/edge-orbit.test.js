import test from 'node:test';
import assert from 'node:assert/strict';
import { edgeOrbitInput } from '../src/edge-orbit.js';

test('edge orbit leaves the content area still and turns in opposite directions', () => {
  for (const width of [375, 1280, 2560]) {
    assert.equal(edgeOrbitInput(0, width), -1);
    assert.equal(edgeOrbitInput(width, width), 1);
    for (const fraction of [.1, .25, .5, .75, .9])
      assert.equal(edgeOrbitInput(width * fraction, width), 0);
    const inset = Math.min(88, width * .07) / 2;
    assert.ok(Math.abs(edgeOrbitInput(inset, width) + .25) < 1e-10);
    assert.ok(Math.abs(edgeOrbitInput(width - inset, width) - .25) < 1e-10);
  }
});

test('outside the canvas cannot continue orbiting', () => {
  assert.equal(edgeOrbitInput(-1, 1280), 0);
  assert.equal(edgeOrbitInput(1281, 1280), 0);
  assert.equal(edgeOrbitInput(0, 0), 0);
});
