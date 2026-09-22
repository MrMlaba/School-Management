// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// react-router v7's code expects TextEncoder/TextDecoder — standard browser
// (and Node) globals — but the jsdom version bundled with react-scripts'
// Jest doesn't provide them. They're built into Node's own `util` module, so
// this just exposes them the same way a real browser or a newer jsdom would.
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = global.TextEncoder || TextEncoder;
global.TextDecoder = global.TextDecoder || TextDecoder;

// jsdom doesn't implement IntersectionObserver or ResizeObserver at all (real
// browsers do) — components that use them (HomePage's scroll/visibility
// checks, MUI/Recharts sizing) would otherwise throw "is not defined" the
// moment they mount in a test. A no-op stand-in is the standard fix: tests
// don't need real intersection/resize behavior, just something that exists.
class ObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = global.IntersectionObserver || ObserverStub;
global.ResizeObserver = global.ResizeObserver || ObserverStub;





