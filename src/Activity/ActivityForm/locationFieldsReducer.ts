interface LocationCoordinateState {
  count: number;
  names: [string, string];
  swapVersion: number;
  enabled: [boolean, boolean];
  lat: [number | null | undefined, number | null | undefined];
  lng: [number | null | undefined, number | null | undefined];
  zoom: [number | null | undefined, number | null | undefined];
}

export function locationFieldsReducer(
  state: LocationCoordinateState,
  action:
    | { type: 'swap' }
    | { type: 'setName'; index: number; name: string }
    | { type: 'setCount'; count: number }
    | { type: 'setMapZoom'; index: number; zoom: number }
    | { type: 'setMarkerCoordinate'; index: number; lat: number; lng: number }
    | {
        type: 'setEnabled';
        swapVersion: number;
        index: number;
        lat: number | null | undefined;
        lng: number | null | undefined;
        zoom: number | null | undefined;
      }
    | {
        type: 'setDisabled';
        index: number;
      },
): LocationCoordinateState {
  switch (action.type) {
    case 'swap':
      return {
        ...state,
        names: [state.names[1], state.names[0]],
        enabled: [state.enabled[1], state.enabled[0]],
        lat: [state.lat[1], state.lat[0]],
        lng: [state.lng[1], state.lng[0]],
        zoom: [state.zoom[1], state.zoom[0]],
        swapVersion: state.swapVersion + 1,
      };
    case 'setName': {
      const names: [string, string] = [...state.names];
      names[action.index] = action.name;
      return { ...state, names };
    }
    case 'setCount': {
      const newState = {
        ...state,
        count: action.count,
      };
      return newState;
    }
    case 'setEnabled': {
      // Ignore geocoding results requested before the locations were swapped.
      if (action.swapVersion !== state.swapVersion) return state;
      const newState = {
        ...state,
      };
      newState.enabled[action.index] = true;
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setDisabled': {
      const newState = {
        ...state,
      };
      newState.enabled[action.index] = false;
      return newState;
    }
    case 'setMapZoom': {
      const newState = {
        ...state,
      };
      newState.zoom[action.index] = action.zoom;
      return newState;
    }
    case 'setMarkerCoordinate': {
      const newState = {
        ...state,
      };
      newState.lat[action.index] = action.lat;
      newState.lng[action.index] = action.lng;
      return newState;
    }
    default:
      return state;
  }
}
