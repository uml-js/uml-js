import { describe, it, expect } from 'vitest';

import { getAttachment, getLabelAdjustment } from '../lib/core/modeling/behavior/LabelLayoutUtil.js';


// a label of 40 x 20 centered at a point
function label(x, y) {
  return { x: x - 20, y: y - 10, width: 40, height: 20 };
}


describe('core - LabelLayoutUtil', function() {

  describe('getAttachment', function() {

    it('should attach to the nearest segment', function() {
      const attachment = getAttachment({ x: 50, y: 20 }, [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ]);

      expect(attachment.type).toBe('segment');
      expect(attachment.segmentIndex).toBe(0);
      expect(attachment.position).toEqual({ x: 50, y: 0 });
      expect(attachment.relativeLocation).toBeCloseTo(0.5);
    });

    it('should attach to a bendpoint beyond the segments', function() {
      const attachment = getAttachment({ x: 120, y: -20 }, [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ]);

      expect(attachment.type).toBe('bendpoint');
      expect(attachment.bendpointIndex).toBe(1);
    });
  });


  describe('getLabelAdjustment', function() {

    it('should keep the label at its point when the end moves', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 200, y: 0 } ];

      // half way along the line, 20 above it
      expect(getLabelAdjustment(label(50, -20), newWaypoints, oldWaypoints, { connectionEnd: true })).toEqual({ x: 50, y: 0 });
    });

    it('should move the label with its segment', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 0, y: 100 }, { x: 100, y: 100 }, { x: 100, y: 200 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 0, y: 140 }, { x: 100, y: 140 }, { x: 100, y: 200 } ];

      // above the middle segment
      expect(getLabelAdjustment(label(50, 80), newWaypoints, oldWaypoints, {
        segmentMove: { segmentStartIndex: 1, newSegmentStartIndex: 1 }
      })).toEqual({ x: 0, y: 40 });
    });

    it('should keep the label on a segment not affected by the change', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 160 } ];

      // above the first segment, the last moved
      expect(getLabelAdjustment(label(40, -20), newWaypoints, oldWaypoints, { connectionEnd: true })).toEqual({ x: 0, y: 0 });
    });

    it('should keep the label on the segment that kept running like before', function() {

      // a straight line whose start moves aside becomes an L, the line from the end stays
      const oldWaypoints = [ { x: 520, y: 392 }, { x: 520, y: 256 } ];
      const newWaypoints = [ { x: 560, y: 392 }, { x: 520, y: 392 }, { x: 520, y: 256 } ];

      expect(getLabelAdjustment(label(575, 320), newWaypoints, oldWaypoints, {
        connectionStart: { x: 560, y: 392 },
        connectionEnd: { x: 520, y: 256 }
      })).toEqual({ x: 0, y: 0 });
    });

    it('should move the label with the segment that moved along with the end', function() {

      // a straight line whose end moves aside becomes an L with the bendpoint at the start
      const oldWaypoints = [ { x: 520, y: 392 }, { x: 520, y: 256 } ];
      const newWaypoints = [ { x: 520, y: 392 }, { x: 560, y: 392 }, { x: 560, y: 256 } ];

      expect(getLabelAdjustment(label(575, 320), newWaypoints, oldWaypoints, {
        connectionStart: { x: 520, y: 392 },
        connectionEnd: { x: 560, y: 256 }
      })).toEqual({ x: 40, y: 0 });
    });

    it('should take the part of a split segment the label is on', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 200, y: 0 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 50 }, { x: 200, y: 0 } ];

      // near the end, beyond the new bendpoint
      const delta = getLabelAdjustment(label(160, -20), newWaypoints, oldWaypoints, {
        bendpointMove: { insert: true, bendpointIndex: 1 }
      });

      expect(delta.y).toBeGreaterThan(0);
      expect(delta.x).not.toBe(0);
    });

    it('should keep the label on its side when the segment turns', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 0, y: 100 } ];

      // above a line to the right is right of a line downwards (rotated with it)
      expect(getLabelAdjustment(label(50, -20), newWaypoints, oldWaypoints, { connectionEnd: true })).toEqual({ x: -30, y: 70 });
    });

    it('should move the label with its bendpoint', function() {
      const oldWaypoints = [ { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 } ];
      const newWaypoints = [ { x: 0, y: 0 }, { x: 130, y: 0 }, { x: 130, y: 100 } ];

      const delta = getLabelAdjustment(label(120, -20), newWaypoints, oldWaypoints, {
        bendpointMove: { insert: false, bendpointIndex: 1 }
      });

      expect(delta.x).toBe(30);
      expect(delta.y === 0).toBe(true);
    });
  });
});
