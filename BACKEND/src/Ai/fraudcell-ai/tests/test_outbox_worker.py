import datetime as dt
import json

from app.messaging.outbox_worker import _build_envelope_bytes


def _row(occurred_at: dt.datetime) -> dict[str, object]:
    return {
        "event_id": "01KY5TD792MY4RM26JC4G29TDP",
        "event_type": "ai.assessment.completed",
        "event_version": 1,
        "occurred_at": occurred_at,
        "producer": "ai-service",
        "correlation_id": "01KY5TD792MY4RM26JC4G29TDQ",
        "causation_id": "01KY5TD792MY4RM26JC4G29TDR",
        "subject_id": "01KY5TD792MY4RM26JC4G29TDS",
        "payload": {"riskScore": 0.91},
    }


def test_envelope_marks_naive_database_timestamp_as_utc() -> None:
    body = _build_envelope_bytes(_row(dt.datetime(2026, 7, 22, 21, 6, 21)))

    assert json.loads(body)["occurredAt"] == "2026-07-22T21:06:21Z"


def test_envelope_converts_aware_timestamp_to_utc() -> None:
    istanbul = dt.timezone(dt.timedelta(hours=3))
    body = _build_envelope_bytes(_row(dt.datetime(2026, 7, 23, 0, 6, 21, tzinfo=istanbul)))

    assert json.loads(body)["occurredAt"] == "2026-07-22T21:06:21Z"
