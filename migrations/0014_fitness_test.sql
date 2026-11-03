CREATE TABLE fitness_test_results (
  id TEXT PRIMARY KEY,
  test_date TEXT NOT NULL,
  ao_id TEXT NOT NULL,
  pax_name TEXT NOT NULL,
  burpees INTEGER,
  big_boy_situps INTEGER,
  hand_release_merkins INTEGER,
  plank_seconds INTEGER,
  mile_seconds INTEGER,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by_person_id TEXT,
  FOREIGN KEY (ao_id) REFERENCES aos(id),
  FOREIGN KEY (updated_by_person_id) REFERENCES people(id)
);

CREATE INDEX fitness_test_results_date_ao_N1 ON fitness_test_results(test_date, ao_id, sort_order);
