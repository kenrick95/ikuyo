export function popElseNavigate({
  setLocation,
  getPopCountFromRouteHistory,
  newLocation,
}: {
  setLocation: (location: string) => void;
  getPopCountFromRouteHistory: (location: string) => number;
  newLocation: string;
}) {
  const popCount = getPopCountFromRouteHistory(newLocation);
  console.log('popCount', popCount, newLocation);
  if (popCount === -1) {
    setLocation(newLocation);
  } else {
    history.go(-popCount);
  }
}
