import React from "react";

export default function StatusCard({ rank, gap, myPost, euro }) {
  return (
    <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 mb-5">
      <div className="text-white/70 text-sm">Sijoitus</div>
      <div className="text-3xl font-bold">{rank}</div>

      <div className="mt-3 text-white/70 text-sm">Ero kärkeen</div>
      <div className="text-xl">
        {gap ? euro(gap) : "-"}
      </div>
    </div>
  );
}
