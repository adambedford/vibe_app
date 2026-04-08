import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import FeedCard from '@/components/feed/FeedCard';

const mockApp = {
  id: 1,
  title: 'Neon Snake',
  category: 'game',
  thumbnail_url: undefined,
  is_multiplayer: false,
  play_count: 234,
  like_count: 56,
  remix_count: 12,
  creator: {
    username: 'pixelwitch',
    display_name: 'Pixel Witch',
    avatar_url: undefined,
  },
  is_liked: false,
};

describe('FeedCard', () => {
  test('renders app title', () => {
    const { getByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(getByText('Neon Snake')).toBeTruthy();
  });

  test('renders creator name', () => {
    const { getByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(getByText('Pixel Witch')).toBeTruthy();
  });

  test('renders play count', () => {
    const { getByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(getByText(/234/)).toBeTruthy();
  });

  test('renders like count', () => {
    const { getByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(getByText(/56/)).toBeTruthy();
  });

  test('shows multiplayer badge when multiplayer', () => {
    const mpApp = { ...mockApp, is_multiplayer: true };
    const { getByText } = render(<FeedCard app={mpApp} onPress={() => {}} />);
    expect(getByText('Multiplayer')).toBeTruthy();
  });

  test('does not show multiplayer badge for solo apps', () => {
    const { queryByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(queryByText('Multiplayer')).toBeNull();
  });

  test('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<FeedCard app={mockApp} onPress={onPress} />);
    fireEvent.press(getByText('Neon Snake'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('formats large counts with K suffix', () => {
    const bigApp = { ...mockApp, play_count: 15230 };
    const { getByText } = render(<FeedCard app={bigApp} onPress={() => {}} />);
    expect(getByText(/15.2K/)).toBeTruthy();
  });

  test('shows game emoji for game category', () => {
    const { getByText } = render(<FeedCard app={mockApp} onPress={() => {}} />);
    expect(getByText('🎮')).toBeTruthy();
  });

  test('shows book emoji for story category', () => {
    const storyApp = { ...mockApp, category: 'story' };
    const { getByText } = render(<FeedCard app={storyApp} onPress={() => {}} />);
    expect(getByText('📖')).toBeTruthy();
  });
});
