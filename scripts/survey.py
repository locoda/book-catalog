#!/usr/bin/env python3
"""Batch cataloging helper: reads remaining works and generates corrected YAML."""
import os, re, yaml

WORKS_DIR = "/Users/1mether/projects/book-catalog/src/data/works"
PEOPLE_DIR = "/Users/1mether/projects/book-catalog/src/data/people"

# Known works mapping: old_filename → { new_filename, title, orig_lang, year, creators, subjects, expressions }
# This will be populated as we identify works

KNOWN = {}

def load_people():
    """Return set of known people IDs"""
    people = set()
    for f in os.listdir(PEOPLE_DIR):
        if f.endswith('.yaml'):
            people.add(f.replace('.yaml', ''))
    return people

def main():
    people = load_people()
    missing_callno = []
    for f in sorted(os.listdir(WORKS_DIR)):
        if not f.endswith('.yaml'):
            continue
        path = os.path.join(WORKS_DIR, f)
        with open(path) as fh:
            data = yaml.safe_load(fh)
        if 'callno' not in data:
            missing_callno.append((f, data))

    print(f"Total files without callno: {len(missing_callno)}")

    # Count by creators_raw
    author_counts = {}
    for fname, data in missing_callno:
        raw = data.get('creators_raw', [])
        for name in raw:
            author_counts[name] = author_counts.get(name, 0) + 1

    # Print top authors
    top = sorted(author_counts.items(), key=lambda x: -x[1])[:30]
    print("\nTop authors needing cataloging:")
    for name, count in top:
        has_record = "✓" if any(name in p for p in people) else "✗"
        print(f"  {has_record} {name}: {count} works")

if __name__ == '__main__':
    main()
