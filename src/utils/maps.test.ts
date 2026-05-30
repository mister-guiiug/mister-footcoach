import { describe, it, expect } from 'vitest';
import { googleMapsUrl, appleMapsUrl } from './maps';

describe('maps url builders', () => {
  it('builds a Google Maps search url with encoded address', () => {
    const url = googleMapsUrl('12 rue du Stade, Paris');
    expect(url).toContain('https://www.google.com/maps/search/');
    expect(url).toContain(encodeURIComponent('12 rue du Stade, Paris'));
  });

  it('builds an Apple Plans url with encoded address', () => {
    const url = appleMapsUrl('12 rue du Stade, Paris');
    expect(url).toContain('https://maps.apple.com/?q=');
    expect(url).toContain(encodeURIComponent('12 rue du Stade, Paris'));
  });

  it('encodes special characters', () => {
    expect(googleMapsUrl('a&b')).toContain('a%26b');
    expect(appleMapsUrl('a b')).toContain('a%20b');
  });
});
