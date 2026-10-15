/**
 * "Activity" list: the latest deliveries (first 6, or all with "Show all"),
 * and a Clear action.
 */
import React, {useState} from 'react';
import {HistoryEntry} from '../../../native';
import {Button, HistoryList, SectionHeader} from '../../../ui';

/** Rows shown before "Show all". */
const HISTORY_PREVIEW = 6;

export function ActivitySection({history, onClear}: {history: HistoryEntry[]; onClear: () => void}) {
  const [showAll, setShowAll] = useState(false);
  const clear = () => {
    setShowAll(false);
    onClear();
  };
  return (
    <>
      <SectionHeader
        title="Activity"
        action={
          history.length > 0
            ? {label: 'Clear', onPress: clear, tone: 'danger', a11yLabel: 'Clear activity'}
            : undefined
        }
      />
      <HistoryList data={history} limit={showAll ? history.length : HISTORY_PREVIEW} />
      {history.length > HISTORY_PREVIEW && (
        <Button
          title={showAll ? 'Show less' : `Show all ${history.length}`}
          variant="ghost"
          onPress={() => setShowAll(v => !v)}
        />
      )}
    </>
  );
}
