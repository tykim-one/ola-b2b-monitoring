-- ops.cn_wind_etl_runs definition

-- Drop table

-- DROP TABLE ops.cn_wind_etl_runs;

CREATE TABLE ops.cn_wind_etl_runs (
	id bigserial NOT NULL,
	started_at timestamptz NOT NULL,
	finished_at timestamptz NULL,
	status varchar(20) NOT NULL,
	files_found int4 DEFAULT 0 NULL,
	files_processed int4 DEFAULT 0 NULL,
	files_skipped int4 DEFAULT 0 NULL,
	files_moved int4 DEFAULT 0 NULL,
	records_inserted int4 DEFAULT 0 NULL,
	records_updated int4 DEFAULT 0 NULL,
	total_records int4 DEFAULT 0 NULL,
	error_count int4 DEFAULT 0 NULL,
	errors _text NULL,
	duration_ms int4 NULL,
	CONSTRAINT cn_wind_etl_runs_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_cn_wind_etl_runs_started_at ON ops.cn_wind_etl_runs USING btree (started_at DESC);
CREATE INDEX idx_cn_wind_etl_runs_status ON ops.cn_wind_etl_runs USING btree (status);