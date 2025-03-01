export const formattedMovingTime = (movingTime: number): string => {
  if (movingTime >= 60) {
    const hours = Math.floor(movingTime / 60);
    const minutes = movingTime % 60;
    return `${hours}h${minutes}m`;
  }
  return `${movingTime}min`;
};

export const formattedDate = (rawDate: string): string => {
  const date = new Date(rawDate);
  return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}
