function CoordinateReadout({ point }) {
  const format = (value) => value.toFixed(2);

  if (!point) {
    return (
      <div className="coord-readout">
        <div className="coord-label">Cursor XYZ</div>
        <div className="coord-value">--</div>
      </div>
    );
  }

  return (
    <div className="coord-readout">
      <div className="coord-label">Cursor XYZ</div>
      <div className="coord-value">
        {format(point.x)}, {format(point.y)}, {format(point.z)}
      </div>
    </div>
  );
}

export default CoordinateReadout;
