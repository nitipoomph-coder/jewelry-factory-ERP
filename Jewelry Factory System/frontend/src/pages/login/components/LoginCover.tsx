import { BACKGROUND_IMAGES } from '../login.constants';

interface LoginCoverProps {
  activeImageIndex: number;
  isRequestAccess: boolean;
}

export function LoginCover({ activeImageIndex, isRequestAccess }: LoginCoverProps) {
  return (
    <div
      className={`login-cover-panel${isRequestAccess ? ' is-request-access' : ''}`}
      aria-hidden="true"
    >
      {BACKGROUND_IMAGES.map((image, index) => (
        <div
          key={image}
          className={`login-cover-image${activeImageIndex === index ? ' is-active' : ''}`}
          style={{ backgroundImage: `url(${image})` }}
        />
      ))}
    </div>
  );
}
