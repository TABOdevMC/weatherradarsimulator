// Wind influence radius in radar coordinates (1.0 ≈ 60 km).
// Keeps storm wind signatures spatially realistic and prevents oversized strong-wind areas.
function windInfluenceRadius(type){
  switch(type){
    case 'supercell': return 0.16; // ~10 km
    case 'derecho': return 0.22;   // ~13 km around the convective line
    case 'line': return 0.18;      // ~11 km
    case 'bow': return 0.19;       // ~11 km
    case 'multicell': return 0.14; // ~8 km
    case 'single': return 0.11;    // ~7 km
    default: return 0.14;
  }
}
