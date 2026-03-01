'use client';

import { useState, useMemo } from 'react';
import { Combobox } from '@headlessui/react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  emptyMessage?: string;
  allowClear?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  label,
  error,
  disabled = false,
  emptyMessage = 'No options found',
  allowClear = true,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('');

  // Find the selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (query === '') {
      return options;
    }

    const lowerQuery = query.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(lowerQuery) ||
      option.description?.toLowerCase().includes(lowerQuery)
    );
  }, [options, query]);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}

      <Combobox
        value={value ?? null}
        onChange={onChange}
        disabled={disabled}
        nullable
      >
        <div className="relative">
          <div className="relative">
            <Combobox.Input
              className={`
                h-9 w-full rounded-lg border bg-white pl-9 pr-10 text-sm
                focus:outline-none focus:ring-2 focus:ring-offset-1
                disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500
                ${error
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20'
                  : 'border-neutral-300 focus:border-primary-400 focus:ring-primary-500/20'
                }
              `}
              displayValue={(optionValue: string | undefined | null) =>
                optionValue ? (options.find((opt) => opt.value === optionValue)?.label ?? '') : ''
              }
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-4 w-4 text-neutral-400" />
            </Combobox.Button>
          </div>

          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg focus:outline-none">
            {/* Clear option */}
            {allowClear && selectedOption && (
              <Combobox.Option
                value={undefined}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-primary-50 text-primary-700' : 'text-neutral-500'
                  }`
                }
              >
                <span className="block truncate italic">Clear selection</span>
              </Combobox.Option>
            )}

            {filteredOptions.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-2 px-4 text-neutral-500 text-sm">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option.value}
                  value={option.value}
                  className={({ active }) =>
                    `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-primary-50 text-primary-900' : 'text-neutral-900'
                    }`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex flex-col">
                        <span className={`block truncate ${selected ? 'font-semibold' : 'font-normal'}`}>
                          {option.label}
                        </span>
                        {option.description && (
                          <span className="block truncate text-xs text-neutral-500">
                            {option.description}
                          </span>
                        )}
                      </div>
                      {selected && (
                        <span
                          className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                            active ? 'text-primary-600' : 'text-primary-600'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </div>
      </Combobox>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
