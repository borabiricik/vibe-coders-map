#import <CoreLocation/CoreLocation.h>
#import <Foundation/Foundation.h>
#import <dispatch/dispatch.h>
#import <objc/runtime.h>

typedef NS_ENUM(int32_t, VibeLocationResult) {
  VibeLocationResultSuccess = 0,
  VibeLocationResultServicesDisabled = 1,
  VibeLocationResultPermissionDenied = 2,
  VibeLocationResultPermissionRestricted = 3,
  VibeLocationResultTimedOut = 4,
  VibeLocationResultUnavailable = 5,
  VibeLocationResultError = 6,
};

static const void *VibeLocationAssociationKey = &VibeLocationAssociationKey;

@interface VibeLocationRequest : NSObject <CLLocationManagerDelegate>
@property(nonatomic, strong) CLLocationManager *manager;
@property(nonatomic, strong) CLLocation *location;
@property(nonatomic, assign) dispatch_semaphore_t semaphore;
@property(nonatomic, assign) VibeLocationResult result;
@property(nonatomic, assign) BOOL completed;
@end

@implementation VibeLocationRequest

- (instancetype)initWithSemaphore:(dispatch_semaphore_t)semaphore {
  self = [super init];
  if (self) {
    _semaphore = semaphore;
    _result = VibeLocationResultTimedOut;
    _completed = NO;
  }
  return self;
}

- (void)requestSingleLocation {
  if (@available(macOS 10.14, *)) {
    [self.manager requestLocation];
  } else {
    [self.manager startUpdatingLocation];
  }
}

- (void)finish:(VibeLocationResult)result {
  if (self.completed) {
    return;
  }

  self.completed = YES;
  self.result = result;
  [self.manager stopUpdatingLocation];
  self.manager.delegate = nil;
  objc_setAssociatedObject(self.manager, VibeLocationAssociationKey, nil, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
  self.manager = nil;
  dispatch_semaphore_signal(self.semaphore);
}

- (void)start {
  if (![CLLocationManager locationServicesEnabled]) {
    [self finish:VibeLocationResultServicesDisabled];
    return;
  }

  self.manager = [[CLLocationManager alloc] init];
  self.manager.delegate = self;
  self.manager.desiredAccuracy = kCLLocationAccuracyHundredMeters;
  objc_setAssociatedObject(self.manager, VibeLocationAssociationKey, self, OBJC_ASSOCIATION_RETAIN_NONATOMIC);

  CLAuthorizationStatus status;
  if (@available(macOS 11.0, *)) {
    status = self.manager.authorizationStatus;
  } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    status = [CLLocationManager authorizationStatus];
#pragma clang diagnostic pop
  }

  switch (status) {
  case kCLAuthorizationStatusAuthorizedAlways:
    [self requestSingleLocation];
    break;
  case kCLAuthorizationStatusNotDetermined:
    if (@available(macOS 10.15, *)) {
      [self.manager requestWhenInUseAuthorization];
    } else {
      [self.manager startUpdatingLocation];
    }
    break;
  case kCLAuthorizationStatusDenied:
    [self finish:VibeLocationResultPermissionDenied];
    break;
  case kCLAuthorizationStatusRestricted:
    [self finish:VibeLocationResultPermissionRestricted];
    break;
  }
}

- (void)locationManager:(CLLocationManager *)manager
    didChangeAuthorizationStatus:(CLAuthorizationStatus)status {
  switch (status) {
  case kCLAuthorizationStatusAuthorizedAlways:
    [self requestSingleLocation];
    break;
  case kCLAuthorizationStatusDenied:
    [self finish:VibeLocationResultPermissionDenied];
    break;
  case kCLAuthorizationStatusRestricted:
    [self finish:VibeLocationResultPermissionRestricted];
    break;
  case kCLAuthorizationStatusNotDetermined:
    break;
  }
}

- (void)locationManager:(CLLocationManager *)manager
     didUpdateLocations:(NSArray<CLLocation *> *)locations {
  CLLocation *location = locations.lastObject;
  if (location == nil) {
    return;
  }

  self.location = location;
  [self finish:VibeLocationResultSuccess];
}

- (void)locationManager:(CLLocationManager *)manager
       didFailWithError:(NSError *)error {
  if ([error.domain isEqualToString:kCLErrorDomain]) {
    if (error.code == kCLErrorLocationUnknown) {
      return;
    }
    if (error.code == kCLErrorDenied) {
      [self finish:VibeLocationResultPermissionDenied];
      return;
    }
  }

  [self finish:VibeLocationResultError];
}

@end

int32_t vibe_request_current_location(double *latitude,
                                      double *longitude,
                                      double *accuracy,
                                      uint64_t *captured_at_ms,
                                      uint32_t timeout_ms) {
  __block VibeLocationRequest *request = nil;
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);

  dispatch_async(dispatch_get_main_queue(), ^{
    request = [[VibeLocationRequest alloc] initWithSemaphore:semaphore];
    [request start];
  });

  int64_t timeout_ns = (int64_t)timeout_ms * (int64_t)NSEC_PER_MSEC;
  long wait_result =
      dispatch_semaphore_wait(semaphore, dispatch_time(DISPATCH_TIME_NOW, timeout_ns));
  if (wait_result != 0) {
    return VibeLocationResultTimedOut;
  }

  if (request.result != VibeLocationResultSuccess || request.location == nil) {
    return request.result;
  }

  CLLocationCoordinate2D coordinate = request.location.coordinate;
  if (latitude != NULL) {
    *latitude = coordinate.latitude;
  }
  if (longitude != NULL) {
    *longitude = coordinate.longitude;
  }
  if (accuracy != NULL) {
    *accuracy = request.location.horizontalAccuracy;
  }
  if (captured_at_ms != NULL) {
    *captured_at_ms =
        (uint64_t) llround([request.location.timestamp timeIntervalSince1970] * 1000.0);
  }

  return VibeLocationResultSuccess;
}
