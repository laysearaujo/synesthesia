import React from 'react'

// StemMapper: shows stems and a dropdown for each to select a visual object
// Props:
// - stems: array of stem keys (e.g. ['drums','bass','vocals','guitar','piano'])
// - mapping: object { stemKey: visualId }
// - visuals: array of visual ids (['Orb','Terrain','Comet','Cloud'])
// - updateMapping(stemId, visualId)

const PRETTY = {
  drums: 'Drums',
  bass: 'Bass',
  vocals: 'Vocals',
  guitar: 'Guitar',
  piano: 'Piano'
}

export default function StemMapper({ stems = [], mapping = {}, visuals = [], updateMapping }) {
  return (
    <div style={{ position: 'absolute', left: '20px', top: '60px', zIndex: 200, color: 'white' }}>
      <div style={{ background: 'rgba(0,0,0,0.6)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '250px' }}>
        <h3 style={{ margin: '0 0 8px 0' }}>Visual Mapping</h3>
        {stems.map(stem => (
          <div key={stem} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
            <div style={{ width: '90px', fontSize: '0.9rem', opacity: 0.9 }}>{PRETTY[stem] || stem}</div>
            <select value={mapping[stem] || ''} onChange={(e) => updateMapping(stem, e.target.value)} style={{ padding: '6px 8px', borderRadius: '8px', background: '#111', color: 'white', border: '1px solid #333' }}>
              <option value="">— select —</option>
              {visuals.map(v => (
                <option value={v} key={v}>{v}</option>
              ))}
            </select>
          </div>
        ))}
        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Atribua qual visual corresponde a cada elemento musical. Escolher um visual já usado por outro elemento os troca.</div>
        <hr style={{ border: 'none', height: '1px', background: '#222', margin: '8px 0' }} />
        <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
          <strong>Visuals (system-defined):</strong>
          <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
            {visuals.map(v => (
              <li key={v} style={{ marginBottom: '6px' }}>
                <strong>{v}</strong>: {v === 'Orb' ? 'esfera pulsante que enfatiza ataques' : v === 'Terrain' ? 'anel/terreno que reage ao baixo' : v === 'Comet' ? 'rastro/movimento para melodia' : 'partículas/atmosfera, reação suave'}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
