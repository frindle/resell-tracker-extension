import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COSTCO_SIGN_IN_MESSAGE, MAX_DETAIL_ORDERS, isSignInUrl, orderCommandPlan, costcoCardLast4, costcoShipAddress,
  costcoMerchandiseSubtotal, mapOrderDetails, costcoReport, judgeTab, judgeDeadline, noDetailsMessage, isCostcoUrl,
  COSTCO_TIMEOUT_MESSAGE,
} from '../src/lib/costcoCommand.ts';

test('sign-in addresses are recognised, the orders page is not', () => {
  assert.equal(isSignInUrl('https://signin.costco.com/b2c/authorize?x=1'), true);
  assert.equal(isSignInUrl('https://www.costco.com/LogonForm?x=1'), true);
  assert.equal(isSignInUrl('https://www.costco.com/myaccount/#/app/abc/orderlist'), false);
  assert.equal(isSignInUrl(undefined), false);
});

test('the sign-in message is the one the tracker looks for', () => {
  assert.match(COSTCO_SIGN_IN_MESSAGE, /sign-in needed/i);
});

test('orderCommandPlan keeps digits, drops repeats and caps the list', () => {
  const many = Array.from({ length: 40 }, (_, i) => `000${1000 + i}`);
  const p = orderCommandPlan(JSON.stringify({ orderNumbers: ['No. 0012-3456', '00123456', ...many], userId: 1 }), '1');
  assert.equal(p.action, 'run');
  if (p.action === 'run') {
    assert.equal(p.orderNumbers[0], '00123456');
    assert.equal(p.orderNumbers.length, MAX_DETAIL_ORDERS);
  }
});

test('orderCommandPlan refuses bad payloads, empty lists and another user', () => {
  assert.equal(orderCommandPlan(null, '1').action, 'fail');
  assert.equal(orderCommandPlan('{', '1').action, 'fail');
  assert.equal(orderCommandPlan(JSON.stringify({ orderNumbers: ['x', ''], userId: 1 }), '1').action, 'fail');
  assert.equal(orderCommandPlan(JSON.stringify({ orderNumbers: ['0001'], userId: 2 }), '1').action, 'fail');
  assert.equal(orderCommandPlan(JSON.stringify({ orderNumbers: ['0001'] }), undefined).action, 'run');
});

test('costcoCardLast4 takes the card that paid the most and skips coupons and gift credits', () => {
  assert.equal(costcoCardLast4([
    { cardNumber: '1111', totalCharged: 5, paymentType: 'VISA' },
    { cardNumber: '************2222', totalCharged: 50, paymentType: 'MASTERCARD' },
    { cardNumber: '9999', totalCharged: 100, paymentType: 'Coupon' },
    { cardNumber: '8888', totalCharged: 100, isGOMPayment: true, paymentType: 'VISA' },
  ]), '2222');
  assert.equal(costcoCardLast4([{ cardNumber: '123456', totalCharged: 1, paymentType: 'VISA' }]), undefined);
  assert.equal(costcoCardLast4(null), undefined);
});

test('costcoShipAddress skips warehouse pickups and joins the lines', () => {
  assert.equal(costcoShipAddress([
    { isShipToWarehouse: true, line1: '1 Depot Rd' },
    { firstName: 'Sam', lastName: ' Example', line1: '12  Test Ln', line2: 'Apt 4', city: 'Testville', state: 'TX', postalCode: '75000' },
  ]), 'Sam Example, 12 Test Ln, Apt 4, Testville, TX 75000');
  assert.equal(costcoShipAddress([{ isShipToWarehouse: true, line1: 'x' }]), '');
  assert.equal(costcoShipAddress(undefined), '');
});

test('costcoMerchandiseSubtotal is merchandise less discounts, or null without a total', () => {
  assert.equal(costcoMerchandiseSubtotal({ merchandiseTotal: '100.10', discountAmount: -10.05 }), 90.05);
  assert.equal(costcoMerchandiseSubtotal({ merchandiseTotal: 5, discountAmount: 9 }), 0);
  assert.equal(costcoMerchandiseSubtotal({ orderTotal: 5 }), null);
  assert.equal(costcoMerchandiseSubtotal({ merchandiseTotal: 'abc' }), null);
});

const details = {
  orderNumber: '000123456', status: 'Shipped', orderPlacedDate: '2030-01-05T10:00:00', orderTotal: 42.5,
  merchandiseTotal: 40, discountAmount: 0,
  orderPayment: [{ cardNumber: '4444', totalCharged: 42.5, paymentType: 'VISA' }],
  shipToAddress: [{
    firstName: 'Sam', lastName: 'Example', line1: '12 Test Ln', city: 'Testville', state: 'TX', postalCode: '75000',
    orderLineItems: [
      { itemDescription: 'Widget', orderStatus: 'Shipped', shipment: [{ trackingNumber: 'TRK1', carrierName: 'Carrier' }, { trackingNumber: 'TRK2', carrierName: 'Email Delivery' }] },
      { itemDescription: 'Gadget', orderStatus: 'Cancelled', shipment: [{ trackingNumber: 'TRK3', carrierName: 'Carrier' }] },
    ],
  }],
};

test('mapOrderDetails builds the tracker row', () => {
  const row = mapOrderDetails(details);
  assert.deepEqual(row, {
    platform: 'Costco', orderNumber: '000123456', orderDate: '2030-01-05', itemDescription: 'Widget', cost: 42.5,
    shippingCost: 0, shippingAddress: 'Sam Example, 12 Test Ln, Testville, TX 75000', trackingNumbers: ['TRK1'],
    sourceUrl: 'https://www.costco.com/myaccount/#/app/4900eb1f-0c10-4bd9-99c3-c59e6c1ecebf/orderdetails/000123456',
    paymentLast4: '4444', merchandiseSubtotal: 40,
  });
});

test('mapOrderDetails skips cancelled orders and ones with no number', () => {
  assert.equal(mapOrderDetails({ ...details, status: 'Cancelled' }), null);
  assert.equal(mapOrderDetails({ ...details, orderNumber: '' }), null);
  assert.equal(mapOrderDetails(null), null);
});

test('mapOrderDetails leaves the card and subtotal out when Costco gave none', () => {
  const row = mapOrderDetails({ ...details, orderPayment: [], merchandiseTotal: undefined });
  assert.ok(row);
  assert.equal('paymentLast4' in row, false);
  assert.equal('merchandiseSubtotal' in row, false);
});

test('costcoReport flags the sign-in failure and only that one', () => {
  assert.deepEqual(costcoReport({ kind: 'error', message: COSTCO_SIGN_IN_MESSAGE }), { status: 'failed', result: { error: COSTCO_SIGN_IN_MESSAGE, signInNeeded: true } });
  assert.deepEqual(costcoReport({ kind: 'error', message: 'Costco sync timed out' }), { status: 'failed', result: { error: 'Costco sync timed out' } });
  assert.deepEqual(costcoReport({ kind: 'done', result: { scraped: 2 } }), { status: 'done', result: { scraped: 2 } });
});

test('isCostcoUrl accepts costco.com pages and nothing that only looks like one', () => {
  assert.equal(isCostcoUrl('https://www.costco.com/myaccount/'), true);
  assert.equal(isCostcoUrl('https://signin.costco.com/b2c/authorize'), true);
  assert.equal(isCostcoUrl('https://www.costco.com.example.org/'), false);
  assert.equal(isCostcoUrl('https://example.org/?u=https://www.costco.com/'), false);
  assert.equal(isCostcoUrl(undefined), false);
});

test('noDetailsMessage counts the skipped orders only when there are some', () => {
  assert.equal(noDetailsMessage(3, 0), 'Costco order details: none of 3 page(s) loaded');
  assert.match(noDetailsMessage(2, 4), /none of 2 page\(s\) loaded.*4 other order\(s\) skipped/);
});

test('noDetailsMessage says deferred orders were not tried', () => {
  assert.equal(noDetailsMessage(3, 0, 0), 'Costco order details: none of 3 page(s) loaded');
  assert.match(noDetailsMessage(2, 0, 5), /none of 2 page\(s\) loaded.*5 not tried/);
  assert.match(noDetailsMessage(2, 1, 5), /1 other order\(s\) skipped.*5 not tried/);
});

const ACCOUNT = 'https://www.costco.com/myaccount/';

test('judgeTab: sign-in address beats everything, a token alone is not proof, an order page is', () => {
  assert.equal(judgeTab({ url: 'https://signin.costco.com/x', hasAuth: true, orderPages: 1, listSeen: true }), 'signed-out');
  assert.equal(judgeTab({ url: ACCOUNT, hasAuth: true, orderPages: 0, listSeen: false }), 'wait');
  assert.equal(judgeTab({ url: ACCOUNT, hasAuth: false, orderPages: 2, listSeen: false }), 'ready');
  assert.equal(judgeTab({ url: ACCOUNT, hasAuth: false, orderPages: 0, listSeen: false }), 'wait');
});

test('judgeTab: an empty order list that was seen counts as ready', () => {
  assert.equal(judgeTab({ url: ACCOUNT, hasAuth: true, orderPages: 0, listSeen: true }), 'ready');
});

test('judgeDeadline: only a sign-in address is signed out, anything else is a timeout', () => {
  assert.equal(judgeDeadline({ url: 'https://signin.costco.com/x', hasAuth: false, orderPages: 0, listSeen: false }), 'signed-out');
  assert.equal(judgeDeadline({ url: ACCOUNT, hasAuth: true, orderPages: 0, listSeen: false }), 'timeout');
  assert.equal(judgeDeadline({ url: '', hasAuth: false, orderPages: 0, listSeen: false }), 'timeout');
});

test('costcoReport: a timeout fails without the sign-in flag', () => {
  assert.deepEqual(costcoReport({ kind: 'timeout', message: COSTCO_TIMEOUT_MESSAGE }), { status: 'failed', result: { error: 'Costco page did not load in time' } });
});

test('orderCommandPlan skips the user check when the extension has no user saved', () => {
  const payload = JSON.stringify({ orderNumbers: ['0001'], userId: 2 });
  assert.equal(orderCommandPlan(payload, undefined).action, 'run');
  assert.equal(orderCommandPlan(payload, '').action, 'run');
  assert.equal(orderCommandPlan(payload, '  ').action, 'run');
  assert.equal(orderCommandPlan(payload, '2').action, 'run');
  assert.equal(orderCommandPlan(payload, '1').action, 'fail');
});
