import { Container, Heading, Text } from '@radix-ui/themes';
import { useState } from 'react';
import {
  MultiSelectAutocomplete,
  type MultiSelectOption,
} from './MultiSelectAutocomplete';

// Example data
const colorOptions: MultiSelectOption[] = [
  { value: 'red', label: 'Red' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'brown', label: 'Brown' },
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
  { value: 'gray', label: 'Gray' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'magenta', label: 'Magenta' },
];

const countryOptions: MultiSelectOption[] = [
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany' },
  { value: 'jp', label: 'Japan' },
  { value: 'au', label: 'Australia' },
  { value: 'in', label: 'India' },
  { value: 'br', label: 'Brazil' },
  { value: 'mx', label: 'Mexico' },
];

export function MultiSelectAutocompleteExample() {
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([
    'us',
    'ca',
  ]);

  return (
    <Container size="2" p="4">
      <Heading size="6" mb="4">
        MultiSelectAutocomplete Examples
      </Heading>

      <div style={{ marginBottom: '2rem' }}>
        <Text
          as="label"
          size="3"
          weight="medium"
          mb="2"
          style={{ display: 'block' }}
        >
          Select Colors
        </Text>
        <Text size="2" color="gray" mb="2" style={{ display: 'block' }}>
          Choose your favorite colors from the list
        </Text>
        <MultiSelectAutocomplete
          options={colorOptions}
          value={selectedColors}
          onChange={setSelectedColors}
          placeholder="Search and select colors..."
        />
        <Text size="2" mt="2" style={{ display: 'block' }}>
          Selected:{' '}
          {selectedColors.length > 0 ? selectedColors.join(', ') : 'None'}
        </Text>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Text
          as="label"
          size="3"
          weight="medium"
          mb="2"
          style={{ display: 'block' }}
        >
          Select Countries
        </Text>
        <Text size="2" color="gray" mb="2" style={{ display: 'block' }}>
          Choose countries you've visited or want to visit
        </Text>
        <MultiSelectAutocomplete
          options={countryOptions}
          value={selectedCountries}
          onChange={setSelectedCountries}
          placeholder="Search and select countries..."
          maxDisplayedOptions={5}
        />
        <Text size="2" mt="2" style={{ display: 'block' }}>
          Selected:{' '}
          {selectedCountries.length > 0 ? selectedCountries.join(', ') : 'None'}
        </Text>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Text
          as="label"
          size="3"
          weight="medium"
          mb="2"
          style={{ display: 'block' }}
        >
          Disabled Example
        </Text>
        <MultiSelectAutocomplete
          options={colorOptions}
          value={['red', 'blue']}
          onChange={() => {}}
          placeholder="This is disabled"
          disabled={true}
        />
      </div>
    </Container>
  );
}
