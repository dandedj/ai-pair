import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Set up DOM environment globals
Object.assign(global, {
    TextEncoder,
    TextDecoder
});
