/*src/components/importANB.tsx*/

import React, { useState } from "react";
import type { PreparedImportData } from "../importsAndExports/prepareForImport";
import { toast } from "react-toastify";

// different than import modal, this system is for importing JSON or PGN for the analysis board
// code below is copied and now needs to be altered

export function importANB({
  data,
  onClose,
  reloadData
}: {
  data: PreparedImportData;
  onClose: () => void;
  reloadData: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleImport = async () => {
  setLoading(true);

  await window.storage.importRepertoires({
    folders: data.folders,
    repertoires: data.repertoires.filter(r => selected.includes(r.id)),
    nodes: data.nodes
  })

  await reloadData();
  toast.success("Imported repertoires successfully");
  setLoading(false);
  onClose();
};

// render: overlay for import
  return (
    <div className="modal-backdrop">
      <div className="modal-window">
        <h2>Import Game</h2>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={selected.length === 0 || loading}
            onClick={handleImport}
          >
            {loading ? "Importing..." : "Import Selected"}
          </button>
        </div>

      </div>
    </div>
  );
}
